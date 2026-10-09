"use client";

import NextLink from "next/link";
import {
  usePathname as useNextPathname,
  useRouter as useNextRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type Navigation = {
  phone: boolean;
  pathname: string;
  search: string;
  push: (href: string) => void;
  href: (href: string) => string;
};
const NavigationContext = createContext<Navigation | null>(null);
const subscribe = (update: () => void) => {
  window.addEventListener("hashchange", update);
  return () => window.removeEventListener("hashchange", update);
};

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = useNextPathname();
  const router = useNextRouter();
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  const phone = pathname === "/phone";
  const route = new URL(
    hash.slice(1).startsWith("/") ? hash.slice(1) : "/",
    "https://commonplace.invalid",
  );
  useEffect(() => {
    if (phone) {
      const timer = window.setTimeout(() => {
        if (route.hash)
          document.getElementById(route.hash.slice(1))?.scrollIntoView();
        else window.scrollTo(0, 0);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [phone, route.hash, route.pathname]);
  return (
    <NavigationContext.Provider
      value={{
        phone,
        pathname: phone ? route.pathname : pathname,
        search: route.search,
        push: (href) => {
          if (phone) window.location.hash = href;
          else router.push(href);
        },
        href: (href) =>
          phone && href.startsWith("/") && !href.startsWith("/api/")
            ? `/phone#${href}`
            : href,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("Navigation provider missing.");
  return context;
}
export function useRouter() {
  return useNavigation();
}
export function usePathname() {
  return useNavigation().pathname;
}
export function useSearchParams() {
  const next = useNextSearchParams();
  const { phone, search } = useNavigation();
  return phone ? new URLSearchParams(search) : next;
}
export default function Link({
  href,
  children,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
}) {
  const navigation = useNavigation();
  return navigation.phone ? (
    <a href={navigation.href(href)} {...props}>
      {children}
    </a>
  ) : (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  );
}
