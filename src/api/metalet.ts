

export async function broadcast(tx: string,chain?:string,net?:string): Promise<any> {
    
  const network =  net


  const body = JSON.stringify({ rawTx: tx, net: network, chain: chain })
  return await fetch(`https://www.metalet.space/wallet-api/v3/tx/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  })
    .then((res) => res.json())
    .then((res) => {
      console.log({ res })
      return res
    })
    .then((result) => {
      
      if(result.code == 0){
        return result.data
      }else{
        throw new Error(result.message)
      }
    }).catch(e=>{
      throw new Error(e)
    })
}