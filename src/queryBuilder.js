function formSystemPrompt(role, format) {
  let initialContent = "";
  if (Array.isArray(role)) {
    const randomInt = Math.floor(Math.random() * role.length);
    initialContent += `${role[randomInt]}\n`
  } else if (typeof role === "string") {
    initialContent += `${role}\n`
  }
  if (format) {
    initialContent += `${format}\n`
  }
  return initialContent;
}

export function createQueryBuilder(roles, format, prompt) {
  const messages = [
    {
      role: "user",
      content: prompt,
    },
  ]

  function addMessage(role = "user", msg) {
    messages.push({
      role,
      content: msg
    })
  }

  function getLast() {
    return messages[messages.length - 1]
  }

  function compile() {
    return [
      {
        role: "system",
        content: formSystemPrompt(roles, format)
      },
      ...messages
    ]
  }

  return {
    addMessage,
    getLast,
    compile,
  }
}
