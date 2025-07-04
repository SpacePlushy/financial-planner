// Test utility for Gemini Code Assist review
export function calculateDiscount(
  price: number,
  discountPercentage: number
): number {
  // Potential issue: no validation for negative values
  const discount = price * (discountPercentage / 100);
  return price - discount;
}

export function formatCurrency(amount: number): string {
  // Potential issue: no locale handling
  return '$' + amount.toFixed(2);
}

export function validateEmail(email: string): boolean {
  // Simplified regex that might miss edge cases
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Intentionally inefficient function for Gemini to catch
export function findDuplicates(arr: number[]): number[] {
  const duplicates: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}
