using System.Diagnostics;
using Goo;
var kind = args.Length > 0 ? args[0] : "shape";
var root = new SparseRoot(kind);
var window = new Window { Title = "Notes triage " + kind, Width = 1000, Height = 640, VSync = false, Root = root };
window.Open();
WindowReadbackTestFixture.ForceRender(window, 0.0);
var times = new double[2000];
var bytes = new long[2000];
for (int i = 0; i < 2302; i++) {
 WindowReadbackTestFixture.PumpNativeEvents();
 var allocated = GC.GetAllocatedBytesForCurrentThread();
 var start = Stopwatch.GetTimestamp();
 var leaf = root.Leaves[(i * 17) % 1000];
 leaf.Mutated = !leaf.Mutated;
 leaf.Rebuild();
 WindowReadbackTestFixture.ForceRender(window, 1.0 / 60.0);
 var elapsed = Stopwatch.GetElapsedTime(start).TotalMilliseconds;
 var allocation = GC.GetAllocatedBytesForCurrentThread() - allocated;
 if(i < 2) Console.WriteLine($"COLD,{kind},{i},{elapsed:F3},{allocation}");
 if(i >= 302) {times[i-302]=elapsed;bytes[i-302]=allocation;}
}
Array.Sort(times);Array.Sort(bytes);
Console.WriteLine($"WARM,{kind},samples=2000,p50_ms={times[999]:F3},p99_ms={times[1979]:F3},p50_B={bytes[999]},p99_B={bytes[1979]}");
window.RequestClose();window.Run();
SparseLeaf.Image.Dispose();
public sealed class SparseRoot(string kind) : Cell {
 public SparseLeaf[] Leaves = new SparseLeaf[1000];
 public override Blob Build() {
  var children = new List<Blob>(1000);
  for(int i=0;i<1000;i++) {var index=i;children.Add(MountSeeded<SparseLeaf>("leaf-"+index, cell => {cell.Index=index;cell.Kind=kind;Leaves[index]=cell;},null));}
  return new Container {Width=1000,Height=640,BackgroundColor=Color.Rgb(12,20,32),Children=children};
 }
}
public sealed class SparseLeaf : Cell {
 public int Index;
 public string Kind="shape";
 public bool Mutated;
 public static readonly VectorPath Path = new PathBuilder(0,0,18,28).MoveTo(0,0).LineTo(18,0).LineTo(18,28).LineTo(0,28).Close().Build();
 public static readonly ImageSource Image = new ImageSource(1,1,new byte[]{48,96,224,255});
 public override Blob Build() {
  var left=(Index%50)*20;var top=(Index/50)*32;var opacity=Mutated?.75:1.0;
  return Kind switch {
   "shape" => new Shape {Path=Path,Width=18,Height=28,Left=left,Top=top,Position=PositionType.Absolute,BackgroundColor=Color.Rgb(48,96,224),Opacity=opacity},
   "image" => new Image {Source=Image,Width=18,Height=28,Left=left,Top=top,Position=PositionType.Absolute,Opacity=opacity},
   _ => new Text {Content="x",Width=18,Height=28,Left=left,Top=top,Position=PositionType.Absolute,Color=Color.Rgb(48,96,224),FontSize=12,Opacity=opacity}
  };
 }
}
