import { useContext } from "react";
import { MascotEventContext } from "../context/MascotEventContext.js";

export function useMascotEvent() {
  const ctx = useContext(MascotEventContext);
  if (!ctx) throw new Error("useMascotEvent must be used within <MascotEventProvider />");
  return ctx;
}
