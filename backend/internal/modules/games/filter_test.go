package games

import (
	"strings"
	"testing"
)

func TestSellableCapacityConditionConstrainsBothPricingModesToConsole(t *testing.T) {
	condition := sellableCapacityCondition(1, 2)
	for _, required := range []string{
		"gp.platform = $1",
		"gbp.platform = $1",
		"gp.zarfiat = $2",
		"cp.code = $2",
		"$2 = ANY(gbp.capacities)",
	} {
		if !strings.Contains(condition, required) {
			t.Errorf("condition missing %q:\n%s", required, condition)
		}
	}
}

func TestSellableCapacityConditionSupportsCapacityAcrossAnyConsole(t *testing.T) {
	condition := sellableCapacityCondition(0, 1)
	if strings.Contains(condition, "gp.platform =") || strings.Contains(condition, "gbp.platform =") {
		t.Fatalf("capacity-only condition unexpectedly restricts a console:\n%s", condition)
	}
	if !strings.Contains(condition, "gp.zarfiat = $1") || !strings.Contains(condition, "cp.code = $1") {
		t.Fatalf("capacity-only condition does not bind capacity consistently:\n%s", condition)
	}
}
