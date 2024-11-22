import { getFunctions, httpsCallable } from 'firebase/functions';

const getExternalApiKey = async (companyId, apiName) => {
  const functions = getFunctions();
  const fetchApiKey = httpsCallable(functions, 'getApiKey');
  try {
    const response = await fetchApiKey({ companyId, apiName });
    return response.data.key;
  } catch (error) {
    console.error('Error fetching API key:', error);
  }
};
