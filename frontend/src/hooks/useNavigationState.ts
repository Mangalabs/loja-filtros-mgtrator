import { useEffect, useState } from "react";
import {
  findActiveNavSection,
  navSectionsStorageKey,
  readInitialOpenNavSections,
  type NavSectionKey,
  type View,
} from "../navigation";

export function useNavigationState(view: View) {
  const [openNavSections, setOpenNavSections] = useState<
    Record<NavSectionKey, boolean>
  >(readInitialOpenNavSections);

  useEffect(() => {
    window.localStorage.setItem(
      navSectionsStorageKey,
      JSON.stringify(openNavSections),
    );
  }, [openNavSections]);

  useEffect(() => {
    const activeSection = findActiveNavSection(view);

    if (!activeSection) {
      return;
    }

    setOpenNavSections((current) => {
      if (current[activeSection]) {
        return current;
      }

      return { ...current, [activeSection]: true };
    });
  }, [view]);

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
