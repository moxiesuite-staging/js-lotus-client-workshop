import { useEffect, useState, useMemo } from 'react'
import { useImmer } from 'use-immer'
import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { BrowserProvider } from '@filecoin-shipyard/lotus-client-provider-browser'
import { testnet } from '@filecoin-shipyard/lotus-client-schema'
import useMiners from "./use-miners"
import useLotusClient from "./use-lotus-client"

const interval = 5000

export default function useMinerMonitor ({ appState, updateAppState }) {
  const client = useLotusClient(null, "node");
  const minerFetch = useMiners(client)
  const { nodesScanned, miners } = appState
  useEffect(() => {
    if (!miners) {
      updateAppState(draft => {
        draft.miners = minerFetch
      });
      return;
    }
    console.log('Jim miner monitor', nodesScanned, miners)
    const state = {
      ticking: true
    }
    const clients = []
    console.log('Client setup', 0, miners[0])
    const api = '127.0.0.1:7777'
    const wsUrl = 'ws://' + api + `/rpc/v0`
    const provider = new BrowserProvider(wsUrl)
    clients.push(new LotusRPC(provider, { schema: testnet.storageMiner }))
    async function runTick () {
      if (!state.ticking) {
        if (client) {
          await client.destroy()
        }
        return
      }
      console.log('Miner monitor tick')
      const minerClient = clients[0];
      const miner = miners[0];
      console.log('Check', 0, miner)
      const sectors = await minerClient.sectorsList()
      console.log('Sectors', sectors)
      /* from node
      const activeSectors = await minerClient.stateMinerActiveSectors(miner)
      console.log('Active Sectors', activeSectors)
      */
      for (const sector of sectors) {
        const sectorsStatus = await minerClient.sectorsStatus(sector, false)
        console.log('Sectors Status', sector, sectorsStatus)
      }
      const retrievalDeals = await minerClient.marketListRetrievalDeals()
      console.log('Retrieval Deals', retrievalDeals)

      setTimeout(runTick, interval)
    }
    runTick()
    return () => {
      state.ticking = false
    }
  }, [nodesScanned, miners])
}
