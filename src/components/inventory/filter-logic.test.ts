
import { transactionTypeFilterFn } from './inventory-utils';

// Mock the row object
const createMockRow = (value: string) => ({
    getValue: (_id: string) => value
});

const runTest = (name: string, rowValue: string, filterValue: string[], expected: boolean) => {
    const row = createMockRow(rowValue);
    const result = transactionTypeFilterFn(row, 'transaction_type', filterValue);
    
    if (result === expected) {
        console.log(`PASS: ${name}`);
    } else {
        console.error(`FAIL: ${name} - Row Value: "${rowValue}", Filter: ${JSON.stringify(filterValue)}, Expected: ${expected}, Got: ${result}`);
    }
};

console.log('Running transactionTypeFilterFn tests...\n');

// Test Case 1: Filter "stock_in" should match "in"
runTest('Filter "stock_in" matches "in"', 'in', ['stock_in'], true);

// Test Case 2: Filter "stock_in" should match "stock_in"
runTest('Filter "stock_in" matches "stock_in"', 'stock_in', ['stock_in'], true);

// Test Case 3: Filter "stock_out" should match "out"
runTest('Filter "stock_out" matches "out"', 'out', ['stock_out'], true);

// Test Case 4: Filter "stock_out" should match "stock_out"
runTest('Filter "stock_out" matches "stock_out"', 'stock_out', ['stock_out'], true);

// Test Case 5: Filter "stock_in" should NOT match "out"
runTest('Filter "stock_in" does NOT match "out"', 'out', ['stock_in'], false);

// Test Case 6: Filter "stock_out" should NOT match "in"
runTest('Filter "stock_out" does NOT match "in"', 'in', ['stock_out'], false);

// Test Case 7: Filter "transfer_in" should match "transfer_in"
runTest('Filter "transfer_in" matches "transfer_in"', 'transfer_in', ['transfer_in'], true);

// Test Case 8: Multiple filters (stock_in OR stock_out) should match "in"
runTest('Filter ["stock_in", "stock_out"] matches "in"', 'in', ['stock_in', 'stock_out'], true);

// Test Case 9: Multiple filters (stock_in OR stock_out) should match "out"
runTest('Filter ["stock_in", "stock_out"] matches "out"', 'out', ['stock_in', 'stock_out'], true);

// Test Case 10: Case insensitivity check (row value "In")
runTest('Case insensitive: "In" matches "stock_in"', 'In', ['stock_in'], true);

console.log('\nTests completed.');
