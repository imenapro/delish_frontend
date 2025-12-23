
export const transactionTypeFilterFn = (row: any, id: string, value: string[]) => {
    const rowValue = String(row.getValue(id)).toLowerCase();
    return value.some((filterVal: string) => {
        // Map filter values to possible data values
        if (filterVal === 'stock_in') return rowValue === 'in' || rowValue === 'stock_in';
        if (filterVal === 'stock_out') return rowValue === 'out' || rowValue === 'stock_out';
        return rowValue === filterVal || rowValue.includes(filterVal);
    });
};

export const getTransactionLabel = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'in':
        case 'stock_in':
            return 'Stock In';
        case 'out':
        case 'stock_out':
            return 'Stock Out';
        case 'transfer_in':
            return 'Transfer In';
        case 'transfer_out':
            return 'Transfer Out';
        case 'sale':
            return 'Sale';
        default:
            return type;
    }
};
