import { createContext, useContext } from "react";

export type OrgSettings = { orgName: string | null; currencyCode: string };

export const OrgSettingsContext = createContext<OrgSettings>({ orgName: null, currencyCode: "USD" });

export function useOrgSettings() {
  return useContext(OrgSettingsContext);
}

