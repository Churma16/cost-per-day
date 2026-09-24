import axios from 'axios';

export const fetchVersion = async () => {
  const versionResponse = await axios.get('/version.json', {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    params: {
      timestamp: Date.now(),
    },
  });

  return versionResponse.data;
};
