import assert from "node:assert/strict";
import { test } from "node:test";
import { automaticStageFor, automaticTransition, CONTACT_STAGES, declinedFromModel } from "./stages";

test("responder después de que le escribimos: new → engaged y nada más", () => {
  assert.equal(automaticStageFor("new", "contact_replied"), "engaged");
  for (const s of ["engaged", "qualified", "customer", "lost"] as const) {
    assert.equal(automaticStageFor(s, "contact_replied"), null, s);
  }
});

test("una cita agendada califica desde new o engaged", () => {
  assert.equal(automaticStageFor("new", "booking_confirmed"), "qualified");
  assert.equal(automaticStageFor("engaged", "booking_confirmed"), "qualified");
  assert.equal(automaticStageFor("qualified", "booking_confirmed"), null);
});

test("nunca saca a nadie de customer ni de lost, ni lo mueve hacia atrás", () => {
  for (const event of ["contact_replied", "booking_confirmed"] as const) {
    const { from } = automaticTransition(event);
    assert.ok(!from.includes("customer"));
    assert.ok(!from.includes("lost"));
    const to = automaticTransition(event).to;
    for (const s of from) {
      assert.ok(CONTACT_STAGES.indexOf(s) < CONTACT_STAGES.indexOf(to), `${s} → ${to}`);
    }
  }
});

test("decir que no le interesa lo pasa a lost desde cualquier etapa abierta, nunca desde customer", () => {
  for (const s of ["new", "engaged", "qualified"] as const) {
    assert.equal(automaticStageFor(s, "contact_declined"), "lost", s);
  }
  assert.equal(automaticStageFor("customer", "contact_declined"), null);
  assert.equal(automaticStageFor("lost", "contact_declined"), null);
});

test("solo un true literal del modelo cuenta como rechazo", () => {
  assert.equal(declinedFromModel({ declined: true }), true);
  for (const v of [false, "true", "si", 1, null, undefined]) {
    assert.equal(declinedFromModel({ declined: v }), false, String(v));
  }
});
