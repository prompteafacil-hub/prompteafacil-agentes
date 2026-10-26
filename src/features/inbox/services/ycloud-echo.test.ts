import assert from "node:assert/strict";
import { test } from "node:test";
import {
  echoBusinessPhone,
  parseOutboundEcho,
} from "./ycloud-webhook-handler";

// Shape taken from YCloud's "WhatsApp Business App Sent Message Sync" examples.
function echoEvent(message: Record<string, unknown>) {
  return {
    id: "evt_eEVCy8eNqD9EvcFI",
    type: "whatsapp.smb.message.echoes",
    apiVersion: "v2",
    createTime: "2026-10-06T12:00:00.000Z",
    whatsappMessage: {
      id: "63f5d602367ea403f8175a6c",
      wamid: "wamid.ECHO1",
      status: "sent",
      from: "+5491100000000",
      to: "+5491155550000",
      wabaId: "WABA-ID",
      sendTime: "2026-10-06T12:00:01.000Z",
      bizType: "whatsapp",
      ...message,
    },
  };
}

test("a text echo becomes the human's reply to the customer", () => {
  const echo = parseOutboundEcho(
    echoEvent({ type: "text", text: { body: "Hola María, te llamo en 5" } }),
  );
  assert.deepEqual(echo, {
    to: "+5491155550000",
    wamid: "wamid.ECHO1",
    type: "text",
    text: "Hola María, te llamo en 5",
    createTime: "2026-10-06T12:00:01.000Z",
    phoneNumberId: null,
  });
});

test("a media echo keeps its caption, or a placeholder without one", () => {
  const withCaption = parseOutboundEcho(
    echoEvent({ type: "image", image: { id: "1", caption: "El presupuesto" } }),
  );
  assert.equal(withCaption?.type, "image");
  assert.equal(withCaption?.text, "El presupuesto");

  const bare = parseOutboundEcho(echoEvent({ type: "image", image: { id: "1" } }));
  assert.equal(bare?.text, "[Multimedia]");
});

test("a voice note echo is stored as audio", () => {
  const echo = parseOutboundEcho(echoEvent({ type: "voice", voice: { id: "9" } }));
  assert.equal(echo?.type, "audio");
});

test("YCloud's own id is the fallback when the wamid is missing", () => {
  const echo = parseOutboundEcho(
    echoEvent({ wamid: undefined, type: "text", text: { body: "ok" } }),
  );
  assert.equal(echo?.wamid, "63f5d602367ea403f8175a6c");
});

test("other events and malformed payloads are not echoes", () => {
  assert.equal(parseOutboundEcho(null), null);
  assert.equal(parseOutboundEcho({ type: "whatsapp.message.updated" }), null);
  assert.equal(
    parseOutboundEcho({ type: "whatsapp.inbound_message.received" }),
    null,
  );
  assert.equal(
    parseOutboundEcho({ type: "whatsapp.smb.message.echoes" }),
    null,
  );
  assert.equal(
    parseOutboundEcho(echoEvent({ to: "", type: "text", text: { body: "x" } })),
    null,
  );
});

test("echoBusinessPhone reads the sender for the destination check", () => {
  assert.equal(
    echoBusinessPhone(echoEvent({ type: "text", text: { body: "x" } })),
    "+5491100000000",
  );
  assert.equal(echoBusinessPhone({}), null);
});

test("whatsapp.smb.message.created is read the same way", () => {
  const event = echoEvent({ type: "text", text: { body: "Your order is ready" } });
  const echo = parseOutboundEcho({ ...event, type: "whatsapp.smb.message.created" });
  assert.equal(echo?.text, "Your order is ready");
  assert.equal(echo?.to, "+5491155550000");
});
