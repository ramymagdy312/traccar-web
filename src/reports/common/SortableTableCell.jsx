import { TableCell, TableSortLabel } from '@mui/material';

const SortableTableCell = ({ sortKey, sortConfig, onSort, children, ...rest }) => {
  const active = sortConfig?.key === sortKey;
  const direction = active ? sortConfig?.direction || 'asc' : 'asc';
  return (
    <TableCell sortDirection={active ? sortConfig?.direction || 'asc' : false} {...rest}>
      <TableSortLabel active={active} direction={direction} onClick={() => onSort(sortKey)}>
        {children}
      </TableSortLabel>
    </TableCell>
  );
};

export default SortableTableCell;
