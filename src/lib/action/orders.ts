"use server";

import { serverMutation, serverFetch } from "../core/server";
import { getUserSession } from "../core/session";
import { CreateOrderPayload } from "@/types";

export const createOrder = async (data: Omit<CreateOrderPayload, "userId">) => {
  const user = await getUserSession();
  if (!user?.id) return null;
  // A checkout also fans out email and feed writes on the server, so it is given
  // a longer budget than a plain write: a slow inbox must never make an order
  // that was actually placed look like a failure.
  return serverMutation("/orders", { ...data, userId: user.id }, "POST", {
    timeoutMs: 30000,
  });
};

export const updateOrderStatus = async (id: string, orderStatus: string) => {
  return serverMutation(`/orders/${id}/status`, { orderStatus }, "PATCH");
};

/**
 * The customer calling off their own order, before it ships. The API refuses it
 * once the parcel has left the store or a rider is holding it.
 */
export const cancelMyOrder = async (id: string, reason?: string) => {
  return serverMutation(`/orders/${id}/cancel`, { reason: reason || "" }, "PATCH");
};

export const getUserOrdersAction = async (userId: string) => {
  if (!userId) return [];
  const res = await serverFetch(`/orders?userId=${userId}`, true);
  return res?.data?.orders || res?.data || (Array.isArray(res) ? res : []);
};
