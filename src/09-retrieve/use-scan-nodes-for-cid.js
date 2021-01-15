import { useEffect, useState } from 'react'
import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { BrowserProvider } from '@filecoin-shipyard/lotus-client-provider-browser'
import { testnet } from '@filecoin-shipyard/lotus-client-schema'
import { useImmer } from 'use-immer'
import IpfsHttpClient from 'ipfs-http-client'

export default function useScanNodesForCid ({ appState, cid }) {
  const [scanningState, setScanningState] = useState({ state: 'idle' })
  const [found, updateFound] = useImmer([])

  useEffect(() => {
    if (!cid) return
    const api = 'localhost:7777'
    let state = { canceled: false }
    updateFound(draft => {
      draft = []
    })
    async function run () {
      if (state.canceled) return
      let count = 1
      setScanningState({
        state: 'scanning',
        currentNode: count++,
        numNodes: 1
      })
      const url = `http://${api}/rpc/v0`
      const provider = new BrowserProvider(url, {
        transport: 'http',
      })
      try {
        const ipfs = IpfsHttpClient({
          host: 'localhost',
          port: 5001,
          protocol: 'http',
          apiPath: `/api/v0`
        })
        const results = ipfs.pin.ls()
        for await (const { cid: resultCid } of results) {
          // console.log('Jim ipfs.pin.ls', nodeNum, cid, resultCid.toString())
          if (cid === resultCid.toString()) {
            updateFound(draft => {
              draft.push({
                node: 0,
                ipfsPin: true
              })
            })
          }
        }
      } catch (e) {
        console.warn('Error ipfs.pin.ls', 0, cid, e)
      }
      const client = new LotusRPC(provider, { schema: testnet.fullNode })
      try {
        if (state.canceled) return
        /*
        const hasLocal = await client.clientHasLocal({ '/': cid })
        if (state.canceled) return
        // console.log('Retrieve hasLocal:', nodeNum, hasLocal)
        if (hasLocal) {
          updateFound(draft => {
            draft.push({
              node: nodeNum,
              local: true
            })
          })
        }
        */
        const offers = await client.clientFindData({ '/': cid }, null)
        if (state.canceled) return
        // console.log('Retrieve findData:', nodeNum, offers)
        updateFound(draft => {
          for (const offer of offers) {
            if (offer.Err !== '') continue
            if (offer.Size === 0) continue
            draft.push({
              node: 0,
              remoteOffer: offer
            })
          }
        })
      } catch (e) {
        console.warn('Node error:', 0, e)
      }
    }
    setScanningState({
      state: 'finished',
      numNodes: 1
    })

    run()
    return () => {
      state.canceled = true
    }
  }, [cid, updateFound, setScanningState])

  return [found, scanningState]
}
