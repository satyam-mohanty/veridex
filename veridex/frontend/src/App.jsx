import { useState } from 'react';
import axios from 'axios';
import { AnimatePresence } from 'framer-motion';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AnalysisWorkspace from './components/AnalysisWorkspace';
import ResultsGrid from './components/ResultsGrid';
import BulkResultsGrid from './components/BulkResultsGrid';

export default function App() {
  const [inputType, setInputType] = useState('email');
  const [isBulk, setIsBulk] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [error, setError] = useState(null);

  const handleModeChange = (type) => {
    setInputType(type);
    setIsBulk(false);
    setInputValue('');
    setResult(null);
    setBulkResults(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!inputValue.trim()) return;

    setLoading(true);
    setResult(null);
    setBulkResults(null);
    setError(null);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

    try {
      if (inputType === 'url' && isBulk) {

        const urls = inputValue
          .split('\n')
          .map((u) => u.trim())
          .filter(Boolean);

        if (urls.length === 0) {
          setLoading(false);
          return;
        }


        const promises = urls.map(async (url) => {
          try {
            const res = await axios.post(`${API_BASE}/scan/url`, { url });
            return { url, result: res.data, error: null };
          } catch {
            return { url, result: null, error: 'Scan failed' };
          }
        });

        const results = await Promise.all(promises);
        setBulkResults(results);
      } else {
        const payload =
          inputType === 'url' ? { url: inputValue } : { text: inputValue };
        const response = await axios.post(
          `${API_BASE}/scan/${inputType}`,
          payload,
        );
        setResult(response.data);
      }
    } catch {
      setError('Analysis failed. Please try again or check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--bg) font-sans">
      <Navbar />
      <Hero />

      <AnalysisWorkspace
        inputType={inputType}
        onModeChange={handleModeChange}
        inputValue={inputValue}
        onInputChange={setInputValue}
        loading={loading}
        onAnalyze={handleAnalyze}
        error={error}
        isBulk={isBulk}
        setIsBulk={setIsBulk}
      />

      <AnimatePresence>
        {result && !loading && !error && <ResultsGrid result={result} />}
      </AnimatePresence>

      <AnimatePresence>
        {bulkResults && !loading && !error && (
          <BulkResultsGrid results={bulkResults} />
        )}
      </AnimatePresence>
    </div>
  );
}
