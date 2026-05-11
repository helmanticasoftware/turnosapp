"use dom";

import TurnosApp from "@/TurnosApp";

type Props = {
  dom?: import("expo/dom").DOMProps;
};

export default function TurnosDomApp(_: Props) {
  return <TurnosApp />;
}
