package FindingBoxedNullablePatternSubjects

class Address {
  prop City string { get; set; }
}

class Person {
  prop Name string { get; set; }
  prop Address Address { get; set; }
}

func Main() int32 {
  let person Person? = Person{Name: "Ada", Address: Address{City: "Lima"}}
  let nested = person is { Address: { City: "Lima" } }
  let boxed = cast[object?](person)
  let boxedMatch = boxed is Person{ Name: "Ada" }
  return nested && boxedMatch ? 0 : 1
}
