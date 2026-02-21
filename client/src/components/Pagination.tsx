interface PaginationProps {
  readonly currentPage: number;
  readonly totalItems: number;
  readonly itemsPerPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onItemsPerPageChange?: (itemsPerPage: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const goToFirstPage = () => onPageChange(1);
  const goToPreviousPage = () => onPageChange(Math.max(1, currentPage - 1));
  const goToNextPage = () => onPageChange(Math.min(totalPages, currentPage + 1));
  const goToLastPage = () => onPageChange(totalPages);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Mostrando <span className="font-medium text-foreground">{startItem}</span> a{' '}
          <span className="font-medium text-foreground">{endItem}</span> de{' '}
          <span className="font-medium text-foreground">{totalItems}</span> registros
        </span>
        {onItemsPerPageChange && (
          <>
            <span className="mx-2">|</span>
            <label className="flex items-center gap-2">
              Por página:
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">
          Página <span className="font-medium text-foreground">{currentPage}</span> de{' '}
          <span className="font-medium text-foreground">{totalPages || 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToFirstPage}
            disabled={!canGoPrevious}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Primera página"
          >
            <span className="material-symbols-outlined text-[20px]">first_page</span>
          </button>
          <button
            onClick={goToPreviousPage}
            disabled={!canGoPrevious}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Página anterior"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={goToNextPage}
            disabled={!canGoNext}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Página siguiente"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
          <button
            onClick={goToLastPage}
            disabled={!canGoNext}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Última página"
          >
            <span className="material-symbols-outlined text-[20px]">last_page</span>
          </button>
        </div>
      </div>
    </div>
  );
}
