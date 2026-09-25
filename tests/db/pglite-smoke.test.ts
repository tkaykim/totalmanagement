import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

describe("PGlite", () => {
  it("supports plpgsql triggers and row level security", async () => {
    const db = new PGlite();
    await db.exec(`
      create table t (id int primary key, v text);
      create function deny_delete() returns trigger language plpgsql as $$
      begin raise exception 'blocked'; end; $$;
      create trigger t_no_delete before delete on t for each row execute function deny_delete();
      alter table t enable row level security;
      insert into t values (1, 'a');
    `);
    await expect(db.exec("delete from t where id = 1")).rejects.toThrow(/blocked/);
    const r = await db.query<{ rowsecurity: boolean }>("select relrowsecurity as rowsecurity from pg_class where relname = 't'");
    expect(r.rows[0].rowsecurity).toBe(true);
    await db.close();
  });
});
