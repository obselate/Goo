package Goo

internal enum VulkanDiagnosticResultClass {
  Success;
  RecoverableWsi;
  NonSuccess;
}

internal class VulkanDiagnosticResultClassifier {
  shared {
    internal func Classify(result VkResult) VulkanDiagnosticResultClass {
      if result == VkConstants.VK_SUCCESS {
        return VulkanDiagnosticResultClass.Success
      }
      if result == VkConstants.VK_SUBOPTIMAL_KHR {
        return VulkanDiagnosticResultClass.RecoverableWsi
      }
      return VulkanDiagnosticResultClass.NonSuccess
    }

    internal func IsSuccess(result VkResult) bool -> Classify(result) == VulkanDiagnosticResultClass.Success

    internal func IsRecoverableWsi(result VkResult) bool -> Classify(result) == VulkanDiagnosticResultClass.RecoverableWsi

    internal func IsNonSuccess(result VkResult) bool -> Classify(result) == VulkanDiagnosticResultClass.NonSuccess
  }
}

internal unsafe partial class VulkanDiagnostics {
  internal func ClassifyResult(result VkResult) VulkanDiagnosticResultClass -> VulkanDiagnosticResultClassifier.Classify(result)

  internal func IsResultSuccess(result VkResult) bool -> VulkanDiagnosticResultClassifier.IsSuccess(result)

  internal func IsResultRecoverableWsi(result VkResult) bool -> VulkanDiagnosticResultClassifier.IsRecoverableWsi(result)

  internal func IsResultNonSuccess(result VkResult) bool -> VulkanDiagnosticResultClassifier.IsNonSuccess(result)
}
