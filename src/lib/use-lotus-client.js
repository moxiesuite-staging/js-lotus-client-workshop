import { useEffect, useState } from 'react'
import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'
import { BrowserProvider } from '@filecoin-shipyard/lotus-client-provider-browser'
import { testnet } from '@filecoin-shipyard/lotus-client-schema'

export default function useLotusClient(nodeNumber, nodeOrMiner) {
  const [client, setClient] = useState()

  useEffect(() => {
    const api = 'localhost:7777'
    const wsUrl = 'ws://' + api + `/rpc/v0`
    const provider = new BrowserProvider(wsUrl)
    const client = new LotusRPC(provider, {
      schema: nodeOrMiner === "node" ? testnet.fullNode : testnet.storageMiner
    })
    setClient(client)
    return () => {
      client.destroy()
    }
  }, [nodeNumber, nodeOrMiner])

  return client
}
