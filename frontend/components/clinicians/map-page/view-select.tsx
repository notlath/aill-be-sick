import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VIEWS = [
  { value: "coordinates", label: "Coordinates view" },
  { value: "district", label: "District view" },
]

type ViewSelectProps = {
  value: 'coordinates' | 'district';
  onValueChange: (value: 'coordinates' | 'district') => void;
  className?: string;
}

const ViewSelect = ({ value, onValueChange, className }: ViewSelectProps) => {
  return (
    <Select value={value} onValueChange={onValueChange as any} className="w-[300px]">
      <SelectTrigger>
        <SelectValue placeholder="Select view" />
      </SelectTrigger>
      <SelectContent>
        {VIEWS.map((view) => (
          <SelectItem key={view.value} value={view.value}>
            {view.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default ViewSelect