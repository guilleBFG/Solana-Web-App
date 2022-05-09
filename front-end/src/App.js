import React, { useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {  Program, Provider, web3 } from "@project-serum/anchor";

import kp from './keypair.json'
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import idl from "./assets/idl.json";

// Constants
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// reference to solana runtime
const { SystemProgram } = web3;
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)
// program id from IDL file
const programID = new PublicKey(idl.metadata.address);
// network of Devnet
const network = clusterApiUrl("devnet");
// control how to acknoledge when transaction is "done"
const opts = { preflightCommitment: "processed" };
const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("phantom wallet found");

          const response = await solana.connect({ onlyTrusted: true });

          console.log(
            "connected to public key: ",
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        } else {
          alert("Solana object not found get Phantom wallet");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();

      setWalletAddress(response.publicKey.toString());
    }
  };
  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        "create a base account w/ address:",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log("error creating base account", error);
    }
  };
  const sendGif = async () => {
    if(inputValue.length === 0){
      console.log('no gif link provided');
      return;
    }
    setInputValue('');
    console.log('gif link: ', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl,programID, provider);
      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log('GIF succesfully sent to program', inputValue);
      await getGifList();
    } catch (error) {
      console.log('Error sending gif', error);
    }
  };
  /**
   *
   * RENDERS
   */
  const renderConnectedContainer = () => {
    console.log(gifList);
    if (gifList  === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    } else {
      return(
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} />
              </div>
            ))}
          </div>
        </div>
      )
    }
  };
  const renderNotConnectedContainer = () => {
    return (
      <button
        className="cta-button connect-wallet-button"
        onClick={connectWallet}
      >
        Connect to Wallet
      </button>
    );
  };

  const getGifList = async () => {
    try {
      // call solana program here
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );
      console.log("got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.log(error);
      setGifList(null);
    }
  };
  /**
   * useeffects
   */

  useEffect(() => {
    if (walletAddress) {
      console.log("fetching GIFT list...");
      getGifList();
    }
  }, [walletAddress]);
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">GIF - Meme Portal</p>
          <p className="sub-text">
            Small collection of Memes and Gif to have humor in the Metaverse!
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
