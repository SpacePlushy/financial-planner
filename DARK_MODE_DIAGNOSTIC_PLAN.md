# Dark Mode Diagnostic Plan

## Problem Statement
Dark mode is not being applied consistently throughout the Financial Schedule Optimizer application despite multiple fixes to individual CSS files.

## Diagnostic Steps

### Phase 1: Verify Theme System Foundation
1. **Check theme application mechanism**
   - Verify UIContext.tsx is correctly setting `data-theme` attribute
   - Confirm the attribute is being set on the correct DOM element
   - Check if theme changes are persisting across components

2. **Verify CSS variable definitions**
   - Check App.css for complete CSS variable definitions
   - Verify both light and dark theme variables are defined
   - Check if variables are scoped correctly

3. **Check CSS cascade and specificity**
   - Identify if any styles are overriding the CSS variables
   - Check for !important declarations
   - Verify CSS module loading order

### Phase 2: Comprehensive File Analysis
1. **Find all CSS files in the project**
   - List all .css and .module.css files
   - Identify which files have been fixed vs. unfixed

2. **Analyze color usage patterns**
   - Files using CSS variables correctly
   - Files with hardcoded colors
   - Files with conflicting dark mode implementations

3. **Check for style conflicts**
   - Inline styles in JSX/TSX files
   - Third-party library styles
   - Global styles that might override theme

### Phase 3: Component Integration Analysis
1. **Check component imports**
   - Verify CSS modules are imported correctly
   - Check if components are using the right CSS files
   - Identify any missing CSS imports

2. **Analyze runtime behavior**
   - Check browser DevTools for actual applied styles
   - Look for style injection order issues
   - Verify CSS variable values at runtime

### Phase 4: Root Cause Identification
1. **Common patterns in failures**
   - Identify what all failing components have in common
   - Check for systematic issues in the build process
   - Look for configuration issues

2. **Theme toggle mechanism**
   - Verify the theme toggle button works
   - Check if theme state is being propagated
   - Confirm localStorage persistence

## Expected Outcomes
- Complete list of files requiring fixes
- Identification of systemic issues
- Clear understanding of why fixes aren't working
- Actionable solution to fix dark mode permanently

## Execution Checklist
- [ ] Check UIContext theme implementation
- [ ] Verify CSS variable definitions in App.css
- [ ] List all CSS files and their status
- [ ] Find all hardcoded colors
- [ ] Check for conflicting implementations
- [ ] Analyze component CSS imports
- [ ] Identify the root cause
- [ ] Document findings