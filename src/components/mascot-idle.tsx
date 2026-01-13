type MascotIdleProps = {
  className?: string;
};

export default function MascotIdle({ className = '' }: MascotIdleProps) {
  return (
    <div className={`flex justify-center ${className}`.trim()}>
      <div className="flex items-center justify-center rounded-3xl border border-emerald-100 bg-white/90 px-5 py-3 shadow-sm shadow-emerald-100">
        <img
          src="/Idle.gif"
          alt="Mascotte GoLingo"
          className="h-24 w-24 object-contain"
        />
      </div>
    </div>
  );
}
