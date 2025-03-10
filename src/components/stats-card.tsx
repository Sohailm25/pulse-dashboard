interface StatsCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

export function StatsCard({ value, label, icon }: StatsCardProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-semibold">{value}</span>
        {icon}
      </div>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}