import React, { useEffect, useState } from 'react'
import copy from 'clipboard-copy'
import useLotusClient from '../lib/use-lotus-client'
import useWatchDefaultWallet from '../lib/use-watch-default-wallet'
import useMiners from '../lib/use-miners'
import DealList from '../08-deals/deal-list'

export default function ProposeDeal ({ appState, updateAppState }) {
  const { selectedNode, fastRetrieval } = appState
  const client = useLotusClient(selectedNode, 'node')
  const miners = useMiners(client)
  const balance = useWatchDefaultWallet({ client, updateAppState })
  const [objectUrlAttribute, setObjectUrlAttribute] = useState()
  const [status, setStatus] = useState()
  const {
    cid,
    importedNode,
    defaultWalletAddress,
    capture: { width, height }
  } = appState
  const epochPrice = '2500'

  useEffect(() => {
    const objectUrl = URL.createObjectURL(appState.capture.blob)
    setObjectUrlAttribute({ src: objectUrl })
    return () => {
      setObjectUrlAttribute(null)
      URL.revokeObjectURL(objectUrl)
    }
  }, [appState.capture])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <h2 style={{ marginBottom: '1rem' }}>Propose a Storage Deal</h2>
      <h4>1. Imported image to node #{importedNode}</h4>
      <div style={{ display: 'flex' }}>
        <div style={{ border: '1px solid black', height }}>
          <img alt='' width={width} height={height} {...objectUrlAttribute} />
        </div>
        <div style={{ padding: '1rem' }}>
          <div>{appState.capture.blob.size} bytes</div>
          <button
            onClick={() => {
              updateAppState(draft => {
                delete draft.capture
                delete draft.cid
                delete draft.importedNode
              })
            }}
          >
            Retake
          </button>
        </div>
      </div>
      <h4>2. A few more details to include in our storage deal proposal</h4>
      <div style={{ textAlign: 'left', fontSize: '80%' }}>
        <div>
          CID:{' '}
          <span style={{ fontSize: '70%' }}>
            {cid} {cid && <button onClick={copyCid}>Copy</button>}
            <br />
          </span>
          <span style={{ fontSize: '70%' }}>
            Generated by hashing your file, same as IPFS CID
            <br />
            <br />
          </span>
        </div>
        <div>
          Wallet address:{' '}
          <span style={{ fontSize: '50%' }}>{defaultWalletAddress}</span>
        </div>
        <div>
          Balance: {typeof balance !== 'undefined' && balance.toFil()} FIL
        </div>
        <div>
          <label>
            <input
              type='checkbox'
              checked={fastRetrieval}
              onChange={() => {
                updateAppState(draft => {
                  draft.fastRetrieval = !fastRetrieval
                })
              }}
              style={{ marginLeft: '1rem' }}
            />
            Use Fast Retrieval
          </label>
        </div>
      </div>
      <h4>3. Click a miner to propose a deal</h4>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}
      >
        {miners &&
          miners.map(miner => {
            return (
              <button
                key={miner}
                style={{ width: '15vw' }}
                onClick={() => proposeDeal(miner)}
              >
                {miner}
              </button>
            )
          })}
      </div>
      <div>{status}</div>
      <br />
      <h4>Deals we've made for this data:</h4>
      <DealList
        client={client}
        appState={appState}
        updateAppState={updateAppState}
        cid={cid}
      />
    </div>
  )

  async function copyCid () {
    console.log('Copying to clipboard', cid)
    await copy(cid)
    console.log('Copied.')
  }

  async function proposeDeal (targetMiner) {
    const dataRef = {
      Data: {
        TransferType: 'graphsync',
        Root: {
          '/': cid
        },
        PieceCid: null,
        PieceSize: 0
      },
      Wallet: defaultWalletAddress,
      Miner: targetMiner,
      EpochPrice: epochPrice,
      MinBlocksDuration: 300,
      FastRetrieval: fastRetrieval,
      VerifiedDeal: false
    }
    setStatus('Proposing...')
    try {
      const result = await client.clientStartDeal(dataRef)
      const { '/': proposalCid } = result
      setStatus('Proposed!')
      updateAppState(draft => {
        draft.proposalCid = proposalCid
        if (!draft.deals) {
          draft.deals = []
        }
        draft.deals.push({
          type: 'camera',
          proposalCid,
          date: Date.now(),
          fromNode: selectedNode,
          miner: targetMiner,
          cid,
          fastRetrieval
          // FIXME: Block height
          // FIXME: Local blob, size
        })
      })
    } catch (e) {
      setStatus('Error: ' + e.message)
      console.log('Exception', e)
    }
  }
}
