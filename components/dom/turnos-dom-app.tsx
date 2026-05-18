"use dom";

import type { ComponentType } from "react";
import TurnosApp from "@/TurnosApp";

type Props = {
  dom?: import("expo/dom").DOMProps;
  userInfo?: {
    name: string;
    email: string;
    provider: string;
  } | null;
};

export default function TurnosDomApp({ userInfo }: Props) {
  const DomApp = TurnosApp as ComponentType<{ externalUserInfo?: Props["userInfo"] }>;
  return <DomApp externalUserInfo={userInfo} />;
}
