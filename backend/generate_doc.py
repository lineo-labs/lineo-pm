#!/usr/bin/env python3
"""
Generate Markdown documentation from Python modules and Pydantic BaseModels.

Usage:
    python generate_backend_docs.py [source_path] [output_dir]

Examples:
    python generate_backend_docs.py ./src ../docs/pages/backend/components
    python generate_backend_docs.py ./src/routers ../docs/pages/backend/routers
    python generate_backend_docs.py ./src/module.py ../docs/pages/backend/components
"""

from __future__ import annotations

import ast
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# -----------------------------
# Data models
# -----------------------------

@dataclass
class FieldInfo:
    name: str
    type_str: str
    required: bool
    default: str
    description: str = ""
    constraints: list[str] = field(default_factory=list)


@dataclass
class FunctionInfo:
    name: str
    doc: str
    params: list[tuple[str, str]]
    returns: str
    decorators: list[str] = field(default_factory=list)
    used_types: list[str] = field(default_factory=list)
    is_async: bool = False
    is_method: bool = False


@dataclass
class ClassInfo:
    name: str
    doc: str
    bases: list[str]
    fields: list[FieldInfo]
    methods: list[FunctionInfo]
    decorators: list[str] = field(default_factory=list)
    is_pydantic_model: bool = False
    is_enum: bool = False
    is_inner: bool = False
    related_models: list[str] = field(default_factory=list)


@dataclass
class ModuleInfo:
    file_path: Path
    module_doc: str
    imports: dict[str, str]
    pydantic_models: list[ClassInfo]
    regular_classes: list[ClassInfo]
    enums: list[ClassInfo]
    functions: list[FunctionInfo]
    external_types_used: list[tuple[str, str]]


# -----------------------------
# Logging
# -----------------------------

class Log:
    BLUE = "\033[0;34m"
    GREEN = "\033[0;32m"
    RED = "\033[0;31m"
    YELLOW = "\033[1;33m"
    NC = "\033[0m"

    @classmethod
    def info(cls, msg: str) -> None:
        print(f"{cls.BLUE}ℹ{cls.NC} {msg}")

    @classmethod
    def success(cls, msg: str) -> None:
        print(f"{cls.GREEN}✓{cls.NC} {msg}")

    @classmethod
    def warn(cls, msg: str) -> None:
        print(f"{cls.YELLOW}⚠{cls.NC} {msg}")

    @classmethod
    def error(cls, msg: str) -> None:
        print(f"{cls.RED}✗{cls.NC} {msg}")


# -----------------------------
# AST helpers
# -----------------------------

BUILTIN_TYPES = {
    "str", "int", "float", "bool", "bytes", "dict", "list", "tuple", "set",
    "frozenset", "None", "Any", "Optional", "Union", "Annotated", "Literal",
    "datetime", "date", "time", "timedelta", "Decimal", "UUID",
    "Sequence", "Mapping", "Iterable"
}

CONSTRAINT_KEYS = {
    "min_length",
    "max_length",
    "gt",
    "ge",
    "lt",
    "le",
    "pattern",
    "regex",
    "min_items",
    "max_items",
    "multiple_of",
    "title",
    "examples",
}


def get_docstring(node: ast.AST) -> str:
    return ast.get_docstring(node) or ""


def safe_unparse(node: Optional[ast.AST]) -> str:
    if node is None:
        return "Any"
    try:
        return ast.unparse(node)
    except Exception:
        return "Any"


def extract_decorators(node: ast.AST) -> list[str]:
    decorators = getattr(node, "decorator_list", []) or []
    return [safe_unparse(d) for d in decorators]


def base_name(base_expr: ast.AST) -> str:
    base_str = safe_unparse(base_expr)
    if "." in base_str:
        return base_str.split(".")[-1]
    return base_str


def parse_imports(tree: ast.Module) -> dict[str, str]:
    imported_names: dict[str, str] = {}

    for node in tree.body:
        if isinstance(node, ast.ImportFrom):
            module = node.module or ""
            for alias in node.names:
                imported_names[alias.asname or alias.name] = module
        elif isinstance(node, ast.Import):
            for alias in node.names:
                imported_names[alias.asname or alias.name] = alias.name

    return imported_names


def is_field_call(value_node: Optional[ast.AST]) -> bool:
    if not isinstance(value_node, ast.Call):
        return False
    fn_name = safe_unparse(value_node.func)
    return fn_name in {"Field", "pydantic.Field"}


def parse_field_metadata(value_node: Optional[ast.AST]) -> tuple[str, str, list[str]]:
    """
    Returns (default, description, constraints)
    """
    if value_node is None:
        return "-", "", []

    if not is_field_call(value_node):
        return safe_unparse(value_node), "", []

    default = "-"
    description = ""
    constraints: list[str] = []

    call = value_node
    if call.args:
        first_arg = call.args[0]
        first_arg_str = safe_unparse(first_arg)
        if first_arg_str != "...":
            default = first_arg_str

    for kw in call.keywords:
        if kw.arg == "description":
            if isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                description = kw.value.value
            else:
                description = safe_unparse(kw.value)
        elif kw.arg in CONSTRAINT_KEYS:
            constraints.append(f"{kw.arg}={safe_unparse(kw.value)}")

    return default, description, constraints


def extract_class_fields(class_node: ast.ClassDef) -> list[FieldInfo]:
    fields: list[FieldInfo] = []

    for item in class_node.body:
        if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
            field_name = item.target.id
            field_type = safe_unparse(item.annotation)

            if item.value is None:
                required = True
                default = "-"
                description = ""
                constraints: list[str] = []
            else:
                default, description, constraints = parse_field_metadata(item.value)
                required = default == "-"

            fields.append(
                FieldInfo(
                    name=field_name,
                    type_str=field_type,
                    required=required,
                    default=default,
                    description=description,
                    constraints=constraints,
                )
            )

    return fields


def collect_type_names(type_str: str) -> list[str]:
    separators = ["[", "]", ",", "|", "(", ")", ":"]
    cleaned = type_str
    for sep in separators:
        cleaned = cleaned.replace(sep, " ")

    tokens = [tok.strip() for tok in cleaned.split() if tok.strip()]
    result: list[str] = []

    for tok in tokens:
        if tok in {"list", "dict", "set", "tuple"}:
            continue
        if tok.startswith("'") and tok.endswith("'"):
            tok = tok[1:-1]
        if "." in tok:
            tok = tok.split(".")[-1]
        if tok and tok not in result:
            result.append(tok)

    return result


def extract_function_info(node: ast.FunctionDef | ast.AsyncFunctionDef, *, is_method: bool = False) -> FunctionInfo:
    params: list[tuple[str, str]] = []
    used_types: list[str] = []

    all_args: list[ast.arg] = []
    all_args.extend(node.args.posonlyargs)
    all_args.extend(node.args.args)

    if node.args.vararg:
        all_args.append(node.args.vararg)

    all_args.extend(node.args.kwonlyargs)

    if node.args.kwarg:
        all_args.append(node.args.kwarg)

    for arg in all_args:
        if is_method and arg.arg in {"self", "cls"}:
            continue

        ann = safe_unparse(arg.annotation) if arg.annotation else "Any"
        params.append((arg.arg, ann))

        for t in collect_type_names(ann):
            if t not in used_types:
                used_types.append(t)

    returns = safe_unparse(node.returns) if node.returns else "None"
    for t in collect_type_names(returns):
        if t not in used_types:
            used_types.append(t)

    return FunctionInfo(
        name=node.name,
        doc=get_docstring(node),
        params=params,
        returns=returns,
        decorators=extract_decorators(node),
        used_types=used_types,
        is_async=isinstance(node, ast.AsyncFunctionDef),
        is_method=is_method,
    )


def is_enum_class(class_node: ast.ClassDef) -> bool:
    for base in class_node.bases:
        b = base_name(base)
        if b in {"Enum", "StrEnum", "IntEnum"}:
            return True
    return False


def extract_class_info(node: ast.ClassDef) -> ClassInfo:
    fields = extract_class_fields(node)
    methods: list[FunctionInfo] = []

    for item in node.body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if item.name.startswith("_") and item.name not in {"__init__"}:
                continue
            methods.append(extract_function_info(item, is_method=True))

    return ClassInfo(
        name=node.name,
        doc=get_docstring(node),
        bases=[safe_unparse(b) for b in node.bases],
        fields=fields,
        methods=methods,
        decorators=extract_decorators(node),
        is_pydantic_model=False,
        is_enum=is_enum_class(node),
        is_inner=False,
        related_models=[],
    )


def resolve_pydantic_models(classes: list[ClassInfo]) -> None:
    """
    Mark classes as pydantic models also when BaseModel inheritance is indirect.
    """
    class_map = {cls.name: cls for cls in classes}

    changed = True
    while changed:
        changed = False
        for cls in classes:
            if cls.is_pydantic_model:
                continue

            for base in cls.bases:
                b = base.split(".")[-1]

                if b == "BaseModel":
                    cls.is_pydantic_model = True
                    changed = True
                    break

                parent = class_map.get(b)
                if parent and parent.is_pydantic_model:
                    cls.is_pydantic_model = True
                    changed = True
                    break


def compute_related_models(classes: list[ClassInfo]) -> None:
    model_names = {cls.name for cls in classes}

    for cls in classes:
        related: list[str] = []

        for field in cls.fields:
            for t in collect_type_names(field.type_str):
                if t in model_names and t != cls.name and t not in related:
                    related.append(t)

        for base in cls.bases:
            b = base.split(".")[-1]
            if b in model_names and b != cls.name and b not in related:
                related.append(b)

        cls.related_models = related


def analyze_module(py_file: Path) -> ModuleInfo:
    source = py_file.read_text(encoding="utf-8")
    tree = ast.parse(source)

    imports = parse_imports(tree)
    module_doc = get_docstring(tree)

    all_classes: list[ClassInfo] = []
    functions: list[FunctionInfo] = []

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            cls = extract_class_info(node)

            # Skip typical inner/config helper classes from main class listing
            if cls.name in {"Config", "Meta"}:
                cls.is_inner = True

            all_classes.append(cls)

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.name.startswith("_"):
                continue
            functions.append(extract_function_info(node))

    resolve_pydantic_models(all_classes)
    compute_related_models(all_classes)

    pydantic_models = [c for c in all_classes if c.is_pydantic_model and not c.is_inner]
    enums = [c for c in all_classes if c.is_enum and not c.is_pydantic_model and not c.is_inner]
    regular_classes = [c for c in all_classes if not c.is_pydantic_model and not c.is_enum and not c.is_inner]

    external_types_used = extract_external_types_used(
        imports=imports,
        pydantic_models=pydantic_models,
        regular_classes=regular_classes,
        enums=enums,
        functions=functions,
    )

    return ModuleInfo(
        file_path=py_file,
        module_doc=module_doc,
        imports=imports,
        pydantic_models=pydantic_models,
        regular_classes=regular_classes,
        enums=enums,
        functions=functions,
        external_types_used=external_types_used,
    )


def extract_external_types_used(
    *,
    imports: dict[str, str],
    pydantic_models: list[ClassInfo],
    regular_classes: list[ClassInfo],
    enums: list[ClassInfo],
    functions: list[FunctionInfo],
) -> list[tuple[str, str]]:
    local_names = {c.name for c in pydantic_models + regular_classes + enums}
    used: set[tuple[str, str]] = set()

    for fn in functions:
        for t in fn.used_types:
            if t in BUILTIN_TYPES or t in local_names:
                continue
            if t in imports:
                used.add((t, imports[t]))

    for cls in pydantic_models + regular_classes:
        for field in cls.fields:
            for t in collect_type_names(field.type_str):
                if t in BUILTIN_TYPES or t in local_names:
                    continue
                if t in imports:
                    used.add((t, imports[t]))

        for method in cls.methods:
            for t in method.used_types:
                if t in BUILTIN_TYPES or t in local_names:
                    continue
                if t in imports:
                    used.add((t, imports[t]))

    return sorted(used)


# -----------------------------
# Markdown generation
# -----------------------------

def anchorize(name: str) -> str:
    return name.lower().replace("_", "-")


def model_link(name: str, local_names: set[str]) -> str:
    if name in local_names:
        return f"[`{name}`](#{anchorize(name)})"
    return f"`{name}`"


def format_signature(fn: FunctionInfo) -> str:
    params = ", ".join(f"{name}: {typ}" for name, typ in fn.params)
    prefix = "async " if fn.is_async else ""
    return f"{prefix}{fn.name}({params}) -> {fn.returns}"


def render_toc(module: ModuleInfo) -> list[str]:
    lines = ["## Contents", ""]

    if module.pydantic_models:
        lines.append("- [Pydantic Models](#pydantic-models)")
        for item in module.pydantic_models:
            lines.append(f"  - [`{item.name}`](#{anchorize(item.name)})")

    if module.enums:
        lines.append("- [Enums](#enums)")
        for item in module.enums:
            lines.append(f"  - [`{item.name}`](#{anchorize(item.name)})")

    if module.regular_classes:
        lines.append("- [Classes](#classes)")
        for item in module.regular_classes:
            lines.append(f"  - [`{item.name}`](#{anchorize(item.name)})")

    if module.functions:
        lines.append("- [Functions](#functions)")
        for item in module.functions:
            lines.append(f"  - [`{item.name}`](#{anchorize(item.name)})")

    if module.external_types_used:
        lines.append("- [External Types Used](#external-types-used)")

    lines.append("")
    return lines


def render_fields_table(fields: list[FieldInfo], *, label: str = "Field") -> list[str]:
    if not fields:
        return ["_No fields detected._", ""]

    lines = [
        f"| {label} | Type | Required | Default | Constraints | Description |",
        "|---|---|---:|---|---|---|",
    ]

    for field in fields:
        req = "yes" if field.required else "no"
        constraints = ", ".join(field.constraints) if field.constraints else "-"
        description = field.description.replace("\n", " ").strip() if field.description else "-"
        lines.append(
            f"| `{field.name}` | `{field.type_str}` | {req} | `{field.default}` | {constraints} | {description} |"
        )

    lines.append("")
    return lines


def render_function_block(fn: FunctionInfo, *, local_names: set[str]) -> list[str]:
    lines = [f"### `{format_signature(fn)}`", ""]

    if fn.doc:
        lines.append(fn.doc)
        lines.append("")
    else:
        lines.append("_No documentation provided._")
        lines.append("")

    if fn.decorators:
        lines.append(f"**Decorators:** `{', '.join(fn.decorators)}`")
        lines.append("")

    if fn.params:
        lines.append("**Parameters**")
        lines.append("")
        for name, typ in fn.params:
            lines.append(f"- `{name}`: `{typ}`")
        lines.append("")

    lines.append("**Returns**")
    lines.append("")
    lines.append(f"- `{fn.returns}`")
    lines.append("")

    model_like = [t for t in fn.used_types if t not in BUILTIN_TYPES]
    if model_like:
        lines.append("**Models / Types used**")
        lines.append("")
        for t in model_like:
            lines.append(f"- {model_link(t, local_names)}")
        lines.append("")

    return lines


def render_relations(model: ClassInfo, *, local_names: set[str]) -> list[str]:
    lines = ["**Relations**", ""]
    has_any = False

    for base in model.bases:
        base_simple = base.split(".")[-1]
        if base_simple in local_names:
            has_any = True
            lines.append(f"- extends {model_link(base_simple, local_names)}")

    for related in model.related_models:
        has_any = True
        lines.append(f"- uses {model_link(related, local_names)}")

    if not has_any:
        lines.append("- _No local model relations detected._")

    lines.append("")
    return lines


def generate_markdown(module: ModuleInfo) -> str:
    title = module.file_path.stem.replace("_", " ").title()
    lines: list[str] = []
    local_names = {c.name for c in module.pydantic_models + module.regular_classes + module.enums}

    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"**File**: `{module.file_path.name}`")
    lines.append("")

    if module.module_doc:
        lines.append("## Overview")
        lines.append("")
        lines.append(module.module_doc)
        lines.append("")

    lines.extend(render_toc(module))

    if module.pydantic_models:
        lines.append("## Pydantic Models")
        lines.append("")
        for model in module.pydantic_models:
            lines.append(f"### `{model.name}`")
            lines.append("")

            if model.doc:
                lines.append(model.doc)
                lines.append("")
            else:
                lines.append("_No documentation provided._")
                lines.append("")

            if model.bases:
                base_labels = [model_link(base.split(".")[-1], local_names) for base in model.bases]
                lines.append(f"**Extends:** {', '.join(base_labels)}")
                lines.append("")

            if model.decorators:
                lines.append(f"**Decorators:** `{', '.join(model.decorators)}`")
                lines.append("")

            lines.extend(render_fields_table(model.fields))
            lines.extend(render_relations(model, local_names=local_names))

            if model.methods:
                lines.append("**Methods**")
                lines.append("")
                for method in model.methods:
                    lines.append(f"- `{format_signature(method)}`")
                lines.append("")

    if module.enums:
        lines.append("## Enums")
        lines.append("")
        for enum_cls in module.enums:
            lines.append(f"### `{enum_cls.name}`")
            lines.append("")

            if enum_cls.doc:
                lines.append(enum_cls.doc)
                lines.append("")
            else:
                lines.append("_No documentation provided._")
                lines.append("")

            if enum_cls.bases:
                lines.append(f"**Extends:** `{', '.join(enum_cls.bases)}`")
                lines.append("")

    if module.regular_classes:
        lines.append("## Classes")
        lines.append("")
        for cls in module.regular_classes:
            lines.append(f"### `{cls.name}`")
            lines.append("")

            if cls.doc:
                lines.append(cls.doc)
                lines.append("")
            else:
                lines.append("_No documentation provided._")
                lines.append("")

            if cls.bases:
                base_labels = [model_link(base.split(".")[-1], local_names) for base in cls.bases]
                lines.append(f"**Extends:** {', '.join(base_labels)}")
                lines.append("")

            if cls.decorators:
                lines.append(f"**Decorators:** `{', '.join(cls.decorators)}`")
                lines.append("")

            if cls.fields:
                lines.extend(render_fields_table(cls.fields, label="Attribute"))

            lines.extend(render_relations(cls, local_names=local_names))

            if cls.methods:
                lines.append("#### Methods")
                lines.append("")
                for method in cls.methods:
                    lines.extend(render_function_block(method, local_names=local_names))

    if module.functions:
        lines.append("## Functions")
        lines.append("")
        for fn in module.functions:
            lines.extend(render_function_block(fn, local_names=local_names))

    if module.external_types_used:
        lines.append("## External Types Used")
        lines.append("")
        for type_name, module_name in module.external_types_used:
            lines.append(f"- `{type_name}` from `{module_name}`")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


# -----------------------------
# File / directory handling
# -----------------------------

def iter_python_files(source_path: Path) -> list[Path]:
    if source_path.is_file():
        return [source_path] if source_path.suffix == ".py" else []

    files = [
        p for p in source_path.rglob("*.py")
        if "__pycache__" not in p.parts
        and ".venv" not in p.parts
        and ".git" not in p.parts
        and not any(part.endswith(".egg-info") for part in p.parts)
    ]
    return sorted(files)


def compute_output_path(py_file: Path, source_root: Path, output_dir: Path) -> Path:
    if source_root.is_file():
        return output_dir / f"{py_file.stem}.md"

    rel = py_file.relative_to(source_root).with_suffix(".md")
    return output_dir / rel


def create_meta_file(output_dir: Path) -> None:
    meta_file = output_dir / "_meta.ts"
    if meta_file.exists():
        return

    meta_file.write_text(
        "export default {\n"
        "  // Auto-generated page order\n"
        "  // Edit this file to reorder or rename pages\n"
        "  /* Example:\n"
        "  'module_name': 'Display Name',\n"
        "  */\n"
        "};\n",
        encoding="utf-8",
    )
    Log.info(f"Created index: {meta_file}")


# -----------------------------
# Main
# -----------------------------

def main() -> int:
    source_arg = sys.argv[1] if len(sys.argv) > 1 else "./src"
    output_arg = sys.argv[2] if len(sys.argv) > 2 else "../docs/pages/backend/components"

    source_path = Path(source_arg).resolve()
    output_dir = Path(output_arg).resolve()

    if not source_path.exists():
        Log.error(f"Source path '{source_path}' not found")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)
    Log.info(f"Source: {source_path}")
    Log.info(f"Output directory: {output_dir}")

    py_files = iter_python_files(source_path)
    Log.info(f"Found {len(py_files)} Python files")

    total = 0
    success = 0
    errors = 0

    for py_file in py_files:
        total += 1
        try:
            module = analyze_module(py_file)
            md_content = generate_markdown(module)

            out_file = compute_output_path(py_file, source_path, output_dir)
            out_file.parent.mkdir(parents=True, exist_ok=True)
            out_file.write_text(md_content, encoding="utf-8")

            success += 1
            Log.success(f"Generated: {out_file.relative_to(output_dir)}")

        except SyntaxError as exc:
            errors += 1
            Log.warn(f"Skipped (syntax error): {py_file} ({exc})")
        except Exception as exc:
            errors += 1
            Log.error(f"Failed: {py_file} ({exc})")

    print()
    print("════════════════════════════════════════")
    Log.info("Documentation Generation Complete")
    print("════════════════════════════════════════")
    print(f"Total files processed: {total}")
    Log.success(f"Successfully generated: {success}")
    if errors:
        Log.warn(f"Errors/Skipped: {errors}")
    else:
        Log.success("No errors")
    print()
    Log.info(f"Output directory: {output_dir}")

    generated_count = len(list(output_dir.rglob("*.md")))
    if generated_count > 0:
        Log.info(f"Generated {generated_count} documentation files")
        create_meta_file(output_dir)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())