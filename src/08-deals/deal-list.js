import React, { useEffect, useState } from 'react'
import { format, formatDistance } from 'date-fns'
import copy from 'clipboard-copy'

const dealStateNames = [
  // go-fil-markets/storagemarket/dealstatus.go
  // updated to v1.1.1 (https://github.com/filecoin-project/go-fil-markets/blob/v1.1.1/storagemarket/dealstatus.go)

  // Unknown means the current status of a deal is undefined
  "Unknown",

  // ProposalNotFound is a status returned in responses when the deal itself cannot
  // be located
  "ProposalNotFound",

  // ProposalRejected is returned by a StorageProvider when it chooses not to accept
  // a DealProposal
  "ProposalRejected",

  // ProposalAccepted indicates an intent to accept a storage deal proposal
  "ProposalAccepted",

  // Staged means a deal has been published and data is ready to be put into a sector
  "Staged",

  // Sealing means a deal is in a sector that is being sealed
  "Sealing",

  // Finalizing means a deal is in a sealed sector and we're doing final
  // housekeeping before marking it active
  "Finalizing",

  // Active means a deal is in a sealed sector and the miner is proving the data
  // for the deal
  "Active",

  // Expired means a deal has passed its final epoch and is expired
  "Expired",

  // Slashed means the deal was in a sector that got slashed from failing to prove
  "Slashed",

  // Rejecting means the Provider has rejected the deal, and will send a rejection response
  "Rejecting",

  // Failing means something has gone wrong in a deal. Once data is cleaned up the deal will finalize on
  // Error
  "Failing",

  // FundsReserved means we've deposited funds as necessary to create a deal, ready to move forward
  "FundsReserved",

  // CheckForAcceptance means the client is waiting for a provider to seal and publish a deal
  "CheckForAcceptance",

  // Validating means the provider is validating that deal parameters are good for a proposal
  "Validating",

  // AcceptWait means the provider is running any custom decision logic to decide whether or not to accept the deal
  "AcceptWait",

  // StartDataTransfer means data transfer is beginning
  "StartDataTransfer",

  // Transferring means data is being sent from the client to the provider via the data transfer module
  "Transferring",

  // WaitingForData indicates either a manual transfer
  // or that the provider has not received a data transfer request from the client
  "WaitingForData",

  // VerifyData means data has been transferred and we are attempting to verify it against the PieceCID
  "VerifyData",

  // ReserveProviderFunds means that provider is making sure it has adequate funds for the deal in the StorageMarketActor
  "ReserveProviderFunds",

  // ReserveClientFunds means that client is making sure it has adequate funds for the deal in the StorageMarketActor
  "ReserveClientFunds",

  // ProviderFunding means that the provider has deposited funds in the StorageMarketActor and it is waiting
  // to see the funds appear in its balance
  "ProviderFunding",

  // ClientFunding means that the client has deposited funds in the StorageMarketActor and it is waiting
  // to see the funds appear in its balance
  "ClientFunding",

  // Publish means the deal is ready to be published on chain
  "Publish",

  // Publishing means the deal has been published but we are waiting for it to appear on chain
  "Publishing",

  // Error means the deal has failed due to an error, and no further updates will occur
  "Error",

  // ProviderTransferAwaitRestart means the provider has restarted while data
  // was being transferred from client to provider, and will wait for the client to
  // resume the transfer
  "ProviderTransferAwaitRestart",

  // ClientTransferRestart means a storage deal data transfer from client to provider will be restarted
  // by the client
  "ClientTransferRestart",

  // AwaitingPreCommit means a deal is ready and must be pre-committed
  "AwaitingPreCommit"
]

function DealHistory ({ dealHistoryData, height }) {
  if (!dealHistoryData || !height) return null
  const now = Date.now()

  return (
    <table style={{ fontSize: '70%' }}>
      <tbody>
        {dealHistoryData.map((record, i) => {
          return (
            <tr key={i}>
              <td>{dealStateNames[record[0]]}</td>
              <td>{blocks(i)}</td>
              <td>{timeElapsed(i)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  function blocks (i) {
    const start = dealHistoryData[i][1]
    const end =
      i < dealHistoryData.length - 1 ? dealHistoryData[i + 1][1] : height
    return `${start} (${end - start} blocks)`
  }

  function timeElapsed (i) {
    const start = dealHistoryData[i][2]
    const end = i < dealHistoryData.length - 1 ? dealHistoryData[i + 1][2] : now
    return (
      `${format(start, 'kk:mm:ss')} ` +
      `(${formatDistance(start, end, { includeSeconds: true })})`
    )
  }
}

export default function DealList ({ client, appState, cid }) {
  const [now, setNow] = useState(Date.now())
  const [height, setHeight] = useState()

  useEffect(() => {
    const state = { canceled: false }
    if (!client) return
    async function run () {
      if (state.canceled) return
      const { Height: height } = await client.chainHead()
      if (state.canceled) return
      setHeight(height)
      setNow(Date.now())
      setTimeout(run, 1000)
    }
    run()
    return () => {
      state.canceled = true
    }
  }, [client])

  if (!appState.deals) return null
  const { dealData, dealHistory } = appState

  let deals = cid
    ? appState.deals.filter(deal => deal.cid === cid)
    : [...appState.deals]
  deals.sort(({ date: a }, { date: b }) => b - a)

  return (
    <div>
      {deals.map(deal => {
        const {
          proposalCid,
          fromNode,
          miner,
          date,
          cid: cidDeal,
          type,
          fastRetrieval
        } = deal
        const data = dealData && dealData[proposalCid]
        const clientDealStatus = data && data.clientDealStatus
        const dealState = clientDealStatus && clientDealStatus.State
        const dealMessage = clientDealStatus && clientDealStatus.Message
        const dealHistoryData = dealHistory && dealHistory[proposalCid]
        return (
          <div key={proposalCid} style={{ marginBottom: '1rem' }}>
            <div>
              Node #{fromNode} -> Miner {miner}
            </div>
            <div style={{ fontSize: '50%' }}>
              <div>Date: {new Date(date).toString()}</div>
              <div>Type: {type}</div>
              <div>Fast Retrieval?: {fastRetrieval ? 'true' : 'false'}</div>
              {!cid && (
                <div>
                  CID: {cidDeal} <button onClick={copyCid}>Copy</button>
                </div>
              )}
              <div>Proposal CID: {proposalCid}</div>
              <div>Deal ID: {clientDealStatus && clientDealStatus.DealID}</div>
              <div>Size: {clientDealStatus && clientDealStatus.Size}</div>
              <div>State: {dealData && dealStateNames[dealState]}</div>
              <div>
                Last update:{' '}
                {data && formatDistance(data.updatedAtTime, now) + ' ago'}
              </div>
              {dealMessage && <div>Message: {dealMessage}</div>}
            </div>
            <DealHistory dealHistoryData={dealHistoryData} height={height} />
          </div>
        )

        async function copyCid () {
          console.log('Copying to clipboard', cidDeal)
          await copy(cidDeal)
          console.log('Copied.')
        }
      })}
    </div>
  )
}
