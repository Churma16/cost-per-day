export const fetchVersion = async () => {
  const response = await fetch('/version.json', {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Version request failed with status ${response.status}`);
  }

  return response.json();
};
