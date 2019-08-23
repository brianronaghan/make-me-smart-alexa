Write a function that:
Takes and ARRAY and a TARGET as inputs.
And return indices of the two numbers such that they add up to the target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Given numArr = [3, 7, 5, 11, 15], target = 10,
Because nums[0] + nums[1] -> 3 + 7 == 10,
return [0, 1].

function findAdditions(numArray, target){
	for (let i = 0; i < numArray.length; i++){
    tempTarget = target - numArray[i]
      if (numArray.indexOf(tempTarget) && numArray.indexOf(tempTarget) != i){
        return[i, numArray.indexOf(tempTarget)]
      }
    }
}

B: 
CHANGE the function so it will catch multiple pairs

Takes and ARRAY and a TARGET as inputs.
And return any pairs indices of two numbers such that they add up to a specific target.

Each input array can have multiple solutions, and you may not use the same element twice.

Given numArr = [3, 7, 5, 11, 15, -1, 7], target = 10,
Because numArr[0] + numArr[1] -> 3 + 7 == 10 AND numArr[3] + numArr[5] -> 11 + -1 == 10,
return [[0, 1], [3,5], [0,6]. (an array of arrays)

function findMultipleAdditions(numArray, target){
	let arrayOfArrays = [];
  for (let i = 0; i < numArray.length; i++){
    tempTarget = target - numArray[i]
    	for (let q = i; q < numArray.length; q++){
      	if (numArray[q] == tempTarget && q != i){
        	arrayOfArrays.push([i, q])
        }
      }
    }
  return arrayOfArrays;
}