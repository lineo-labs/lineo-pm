interface CreateProjectButtonProps {
  onClick: () => void;
}

export const CreateProjectButton = ({ onClick }: CreateProjectButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:bg-indigo-400"
    >
      Create project
    </button>
  );
};
