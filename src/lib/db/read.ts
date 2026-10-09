// Server reads use the Admin SDK (which bypasses rules), so every scoped read goes through here
// and applies the same check as firestore.rules: the user's node must be in the doc's node_path.
import { db } from "@/lib/firebase/admin";
import type { Actor } from "./write";
import type { Collection } from "./schema";

export const scopedQuery = (actor: Actor, coll: Collection | "audit_log") =>
  db.collection(coll).where("node_path", "array-contains", actor.node);

export type OrgNodeRow = {
  id: string;
  type: "group" | "company" | "bu" | "project";
  name: string;
  code: string;
  parent_id: string | null;
  node_path: string[];
  country: string;
  state?: string;
  is_overseas: boolean;
  is_listed: boolean;
  rbi_location_class?: string;
};

// ponytail: loads the whole visible tree (~330 nodes max); paginate if the org grows 10x.
export async function visibleNodes(actor: Actor): Promise<OrgNodeRow[]> {
  const snap = await scopedQuery(actor, "org_nodes").get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as OrgNodeRow)
    .sort((a, b) => a.node_path.join("/").localeCompare(b.node_path.join("/")));
}
