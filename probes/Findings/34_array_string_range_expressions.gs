package FindingArrayStringRangeExpressions

func Main() int32 {
  let values = []int32{ 0, 1, 2, 3 }
  let middle = values[1 .. 3]
  let head = values[.. 2]
  let tail = values[1 ..]
  let all = values[..]
  let text = "gsharp" [1 .. 4]
  return middle.Length == 2 && middle[0] == 1 && middle[1] == 2
    && head.Length == 2 && head[1] == 1
    && tail.Length == 3 && tail[2] == 3
    && all.Length == 4 && text == "sha" ? 0 : 1
}
