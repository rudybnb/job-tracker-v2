import { Router } from "express";

export const testWebhookRouter = Router();

testWebhookRouter.post("/webhook-test", (req, res) => {
  console.log("[Test Webhook] Received request:", JSON.stringify(req.body));
  res.json({ success: true, message: "Test webhook works!", body: req.body });
});

testWebhookRouter.get("/webhook-test", (req, res) => {
  res.json({ success: true, message: "Test webhook GET works!" });
});
