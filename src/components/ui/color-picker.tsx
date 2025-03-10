import { ToggleGroup, ToggleGroupItem } from './toggle-group';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const colors = [
    { name: 'Purple', class: 'bg-purple-600' },
    { name: 'Blue', class: 'bg-blue-600' },
    { name: 'Green', class: 'bg-green-600' },
    { name: 'Yellow', class: 'bg-yellow-600' },
    { name: 'Orange', class: 'bg-orange-600' },
    { name: 'Red', class: 'bg-red-600' },
    { name: 'Pink', class: 'bg-pink-600' },
    { name: 'Indigo', class: 'bg-indigo-600' },
  ];

  return (
    <div className="flex items-center gap-2">
      {colors.map(color => (
        <button
          key={color.class}
          onClick={() => onChange(color.class)}
          className={`w-6 h-6 rounded-full transition-all ${color.class} ${
            value === color.class 
              ? 'ring-2 ring-primary ring-offset-2'
              : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
          }`}
          aria-label={color.name}
        />
      ))}
    </div>
  );
}