import { useEffect, useState } from "react";
import {
  navSectionsStorageKey,
  readInitialOpenNavSections,
  type NavSectionKey,
} from "../navigation";

export function useNavigationState() {
  const [openNavSections, setOpenNavSections] = useState<
    Record<NavSectionKey, boolean>
  >(readInitialOpenNavSections);

  useEffect(() => {
    window.localStorage.setItem(
      navSectionsStorageKey,
      JSON.stringify(openNavSections),
    );
  }, [openNavSections]);

  function toggleNavSection(section: NavSectionKey) {
    setOpenNavSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  return {
    openNavSections,
    toggleNavSection,
  };
}
