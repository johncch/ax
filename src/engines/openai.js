import OpenAI from "openai";

export class OpenAIProvider {
  name = "OpenAI";

  constructor(config) {
    this.openai = new OpenAI({ apiKey: config.providers.openai["api-key"] });
  }

  createRequest(system, user) {
    const s = { role: "system", content: system };
    const u = user.map((msg) => ({ role: "user", content: msg }));
    const messages = [s, ...u];
    return new OpenAIRequest(this.openai, messages);
  }
}

class OpenAIRequest {
  messages = {};

  constructor(openai, messages, model) {
    this.openai = openai;
    this.model = model || "gpt-4o";
    this.messages = messages;
  }

  async execute() {
    // The implementation right now does not wait for user prompt
    // We'll add features as we need them
    const promise = new Promise(async (resolve, reject) => {
      const messages = this.messages;
      let stats = { in: 0, out: 0 };

      const chat_completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
      });

      stats.in += chat_completion.usage.prompt_tokens;
      stats.out += chat_completion.usage.completion_tokens;

      const choices = chat_completion.choices;
      if (choices.length <= 0) {
        reject("No responses from OpenAI");
        return;
      }

      const firstMessage = choices[0];
      if (firstMessage.finish_reason === "stop") {
        resolve({ response: firstMessage.message.content, stats });
      } else {
        reject(firstMessage.finish_reason);
      }
    });

    return promise;
  }
}
