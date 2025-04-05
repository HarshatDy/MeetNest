import { useNavigation } from '@react-navigation/native';

/**
 * Custom hook to access the root navigation object
 * This is useful for navigating to screens that are at the root level
 * of the navigation tree, like the Login screen.
 */
export function useRootNavigation() {
  const navigation = useNavigation();
  
  // Attempt to get the root navigator
  let currentNav = navigation;
  let parent = navigation.getParent();
  
  // Traverse up the navigator tree to find the root
  while (parent) {
    currentNav = parent;
    parent = parent.getParent();
  }
  
  return currentNav;
}
