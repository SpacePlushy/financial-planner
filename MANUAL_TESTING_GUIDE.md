# Financial Schedule Optimizer - Manual Testing Guide

## Prerequisites
- Development server running on http://localhost:3000
- Modern web browser (Chrome, Firefox, Safari, or Edge)

## Testing Checklist

### 1. Initial Page Load
- [ ] Open http://localhost:3000 in your browser
- [ ] Verify the page loads without errors (check browser console)
- [ ] Confirm the application title appears correctly
- [ ] Check that all UI elements are visible and properly styled

### 2. Configuration Panel Testing
- [ ] **Starting Balance**
  - [ ] Enter a positive number (e.g., 1000)
  - [ ] Enter a negative number (e.g., -500)
  - [ ] Enter zero
  - [ ] Try invalid input (letters, special characters)
  
- [ ] **Target Ending Balance**
  - [ ] Enter various values
  - [ ] Verify it accepts positive and negative numbers
  
- [ ] **Minimum Balance**
  - [ ] Enter different values
  - [ ] Ensure it works with negative minimums
  
- [ ] **Optimization Parameters**
  - [ ] Adjust Population Size slider
  - [ ] Adjust Max Generations slider
  - [ ] Verify values update in real-time
  
- [ ] **Presets**
  - [ ] Click "Conservative" - verify parameters change
  - [ ] Click "Aggressive" - verify parameters change
  - [ ] Click "Balanced" - verify parameters change
  - [ ] Click "Quick" - verify parameters change

### 3. Schedule Table Testing
- [ ] **View Toggle**
  - [ ] Switch between Table and Calendar views
  - [ ] Verify data displays correctly in both views
  
- [ ] **Weekend Toggle**
  - [ ] Click "Show Weekends" / "Hide Weekends"
  - [ ] Verify weekends are shown/hidden appropriately
  
- [ ] **Cell Editing**
  - [ ] Double-click on an earnings cell
  - [ ] Enter a new value and press Enter
  - [ ] Verify the value updates
  - [ ] Verify balance recalculates
  - [ ] Try editing expenses cells
  - [ ] Test Tab/Shift+Tab navigation between cells
  - [ ] Test Escape key to cancel editing
  
- [ ] **Date Display**
  - [ ] Verify all 30 days are displayed
  - [ ] Check date formatting is consistent

### 4. Optimization Testing
- [ ] **Start Optimization**
  - [ ] Click "Optimize" button
  - [ ] Verify progress bar appears
  - [ ] Watch for generation counter updates
  - [ ] Confirm optimization completes
  
- [ ] **Pause/Resume**
  - [ ] Start optimization
  - [ ] Click "Pause" - verify it pauses
  - [ ] Click "Resume" - verify it continues
  
- [ ] **Cancel**
  - [ ] Start optimization
  - [ ] Click "Cancel" - verify it stops
  - [ ] Check that partial results are retained
  
- [ ] **Performance**
  - [ ] Monitor browser performance during optimization
  - [ ] Verify UI remains responsive

### 5. Data Management Testing
- [ ] **Auto-save**
  - [ ] Make changes to the schedule
  - [ ] Refresh the page
  - [ ] Verify changes persist
  
- [ ] **Export**
  - [ ] Add some data to the schedule
  - [ ] Click "Export" button
  - [ ] Verify JSON file downloads
  - [ ] Open file and check structure
  
- [ ] **Import**
  - [ ] Click "Import" button
  - [ ] Select the previously exported file
  - [ ] Verify data loads correctly
  - [ ] Try importing an invalid file
  
- [ ] **Clear Data**
  - [ ] Make changes to schedule
  - [ ] Clear browser's localStorage
  - [ ] Refresh page
  - [ ] Verify data is reset

### 6. Summary Panel Testing
- [ ] **Calculations**
  - [ ] Add earnings and expenses
  - [ ] Verify total income calculates correctly
  - [ ] Verify total expenses sum properly
  - [ ] Check net income (income - expenses)
  - [ ] Verify average daily calculations
  
- [ ] **Real-time Updates**
  - [ ] Edit schedule values
  - [ ] Confirm summary updates immediately

### 7. Error Handling
- [ ] **Invalid Inputs**
  - [ ] Enter text in number fields
  - [ ] Enter extremely large numbers
  - [ ] Leave required fields empty
  
- [ ] **File Operations**
  - [ ] Try importing a non-JSON file
  - [ ] Import a corrupted JSON file
  - [ ] Test with empty JSON file

### 8. Responsive Design
- [ ] **Desktop (1920x1080)**
  - [ ] Verify full layout displays correctly
  
- [ ] **Tablet (768x1024)**
  - [ ] Check if layout adapts properly
  - [ ] Test all interactive elements
  
- [ ] **Mobile (375x667)**
  - [ ] Verify mobile layout
  - [ ] Test touch interactions
  - [ ] Check horizontal scrolling

### 9. Browser Compatibility
Test all above features in:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (macOS only)
- [ ] Edge

### 10. Performance Metrics
Using browser DevTools:
- [ ] **Network Tab**
  - [ ] Initial load time < 3 seconds
  - [ ] Bundle size reasonable
  - [ ] No failed requests
  
- [ ] **Performance Tab**
  - [ ] No major layout shifts
  - [ ] Smooth animations
  - [ ] No memory leaks after extended use
  
- [ ] **Console**
  - [ ] No errors in console
  - [ ] No warnings (except React strict mode)

## Bug Reporting Template
If you find issues, document them as:
```
**Issue**: [Brief description]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
**Expected**: [What should happen]
**Actual**: [What actually happens]
**Browser**: [Browser and version]
**Screenshot**: [If applicable]
```

## Testing Notes
- Focus on user workflows rather than individual features
- Test edge cases (empty data, large numbers, rapid clicks)
- Verify data integrity after each operation
- Check for accessibility (keyboard navigation, screen reader hints)