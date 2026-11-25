interface SpinnerProps {
  size?: "sm" | "md";
  label?: string;
}

const SIZE_CLASSES = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2" };

export function Spinner({ size = "md", label = "Cargando" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`
        inline-block animate-spin rounded-full border-line border-t-brand-500
        motion-reduce:animate-none
        ${SIZE_CLASSES[size]}
      `}
    />
  );
}