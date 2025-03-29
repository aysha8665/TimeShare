// hooks/useMetaMask.js
"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const useMetaMask = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize provider
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const initializeProvider = async () => {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);
        
        try {
          const accounts = await newProvider.send('eth_accounts', []);
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setSigner(await newProvider.getSigner());
          }
        } catch (error) {
          console.error('Error initializing provider:', error);
        }
      };
      
      initializeProvider();
    }
  }, []);

  // Handle account changes
  useEffect(() => {
    if (!provider) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setSigner(await provider.getSigner());
      } else {
        setAccount(null);
        setSigner(null);
      }
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [provider]);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      if (!window.ethereum) throw new Error('Please install MetaMask');
      
      // Reset previous connections
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await newProvider.send('eth_requestAccounts', []);
      
      setProvider(newProvider);
      setAccount(accounts[0]);
      setSigner(await newProvider.getSigner());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return { provider, signer, account, connect, error, isConnecting };
};

export default useMetaMask;