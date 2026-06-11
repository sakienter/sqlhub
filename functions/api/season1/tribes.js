export async function onRequestGet() {
  return new Response(JSON.stringify({ DAY1: {}, DAY2: {}, DAY3: {}, DAY4: {} }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
