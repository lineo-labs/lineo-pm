declare module "react-day-picker" {
  export type DateRange = {
    from?: Date;
    to?: Date;
  };

  export interface DayPickerProps {
    mode?: "single" | "multiple" | "range";
    selected?: Date | Date[] | DateRange;
    onSelect?: (range?: DateRange) => void;
    defaultMonth?: Date;
    weekStartsOn?: number;
    className?: string;
  }

  export const DayPicker: (props: DayPickerProps) => JSX.Element;
}
