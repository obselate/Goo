package FindingDataClassWithInitializer

data class ProfileCard {
  prop Name string { get; set; }
  prop Age int32 { get; set; }
}

func Main() int32 {
  let first = ProfileCard{ Name: "ada", Age: 36 }
  let second = first with{ Age = 37 }
  return first.Name == "ada" && first.Age == 36 && second.Name == "ada" && second.Age == 37 ? 0 : 1
}
