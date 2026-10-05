import Autocomplete, {
  createFilterOptions,
} from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

export type SearchableSelectOption = {
  value: string
  label: string
  searchText?: string
}

type SearchableSelectFieldProps = {
  disabled?: boolean
  label: string
  name?: string
  noOptionsText?: string
  options: SearchableSelectOption[]
  placeholder?: string
  required?: boolean
  size?: 'small' | 'medium'
  value: string
  onChange: (value: string) => void
}

const filterOptions = createFilterOptions<SearchableSelectOption>({
  stringify: (option) => `${option.label} ${option.searchText ?? ''}`,
})

export function SearchableSelectField({
  disabled,
  label,
  name,
  noOptionsText = 'Nenhuma opção encontrada',
  options,
  placeholder,
  required,
  size = 'medium',
  value,
  onChange,
}: SearchableSelectFieldProps) {
  const selectedOption =
    options.find((option) => option.value === value) ?? null

  return (
    <>
      {name ? <input name={name} type='hidden' value={value} /> : null}
      <Autocomplete
        autoHighlight
        disabled={disabled}
        filterOptions={filterOptions}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, selected) =>
          option.value === selected.value
        }
        noOptionsText={noOptionsText}
        options={options}
        value={selectedOption}
        onChange={(_event, option) => onChange(option?.value ?? '')}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={selectedOption ? undefined : placeholder}
            required={required}
            size={size}
          />
        )}
      />
    </>
  )
}
