export function advertising(price:number,drr:number,buyout:number){const order=price*drr/100;return {order,buyout:order/(buyout/100)};}
