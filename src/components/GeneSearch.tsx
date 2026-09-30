import { Search, SlidersHorizontal } from "lucide-react";

interface GeneSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
}

function GeneSearch({
  search,
  onSearchChange,
}: GeneSearchProps) {
  return (
    <div className="gene-search">
      <div className="search-input-wrapper">
        <Search size={19} />

        <input
          type="text"
          placeholder="Buscar por gen, nombre o identificador..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <button className="filter-button">
        <SlidersHorizontal size={18} />
        Filtros
      </button>
    </div>
  );
}

export default GeneSearch;