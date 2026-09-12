// Decode SSE across arbitrary network chunks, including split UTF-8 and CRLF boundaries.
export async function* readEvents(stream) {
  const reader = stream.getReader(), decoder = new TextDecoder();
  let buffer = '';
  function parse(frame) {
    const lines = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart());
    if (!lines.length) return null;
    let event = JSON.parse(lines.join('\n'));
    if (typeof event === 'string') event = JSON.parse(event); // AgentCore's string-wrapped events.
    if (!event || typeof event !== 'object') throw new Error('The live stream returned an unreadable event.');
    if (!event.type && event.error) return {type: 'error', message: String(event.error)};
    return event.type ? event : null;
  }
  try {
    while (true) {
      const {value, done} = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, {stream: true});
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const event = parse(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (event) yield event;
      }
      if (done) {
        if (buffer.trim()) { const event = parse(buffer); if (event) yield event; }
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
